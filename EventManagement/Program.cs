using Microsoft.EntityFrameworkCore;
using EventManagement.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Add DB Context Support for SQL Server
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();